import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant test - Collect with timestamp condition reversed", function () {
  it("should kill mutant by calling Collect after unlock time and expecting success", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const walletAddress = await wallet.getAddress();
    
    // Set unlock time to 1 hour in the future
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
    const unlockTime = currentTime + 3600; // 1 hour from now
    
    // Deposit 2 ether with unlock time
    const depositAmount = ethers.parseEther("2");
    await wallet.connect(user).Put(unlockTime, { value: depositAmount });
    
    // Verify balance
    expect(await wallet.connect(user).Acc(user.address)).to.deep.equal([
      BigInt(unlockTime),
      depositAmount
    ]);
    
    // Fast forward time past unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");
    
    // Attempt to collect 1 ether - should succeed in original, revert in mutant
    const collectAmount = ethers.parseEther("1");
    
    // In original contract: block.timestamp > unlockTime -> should succeed
    // In mutant: block.timestamp < unlockTime -> will revert since block.timestamp > unlockTime
    await expect(
      wallet.connect(user).Collect(collectAmount)
    ).to.not.be.reverted;
    
    // Verify the balance decreased
    const updatedAcc = await wallet.connect(user).Acc(user.address);
    expect(updatedAcc.balance).to.equal(depositAmount - collectAmount);
  });
});