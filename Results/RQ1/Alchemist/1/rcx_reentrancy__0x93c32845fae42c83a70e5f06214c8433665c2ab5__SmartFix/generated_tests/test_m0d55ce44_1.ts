import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - m0d55ce44", function () {
  it("should kill mutant by depositing exactly MinSum (1 ether) and then collecting it", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await XWalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Get MinSum (should be 1 ether)
    const minSum = await wallet.MinSum();
    
    // User deposits exactly MinSum (1 ether)
    const depositTx = await wallet.connect(user).Put(0, { value: minSum });
    await depositTx.wait();
    
    // Verify balance is exactly MinSum
    const holder = await wallet.Acc(user.address);
    expect(holder.balance).to.equal(minSum);
    
    // Wait for unlock time to pass (unlockTime = block.timestamp since we used 0)
    // The Put function sets unlockTime = block.timestamp when _unlockTime <= block.timestamp
    
    // Now try to collect the exact MinSum amount
    // Original: should succeed because balance >= MinSum (1 ether >= 1 ether)
    // Mutant: should revert because balance > MinSum is false (1 ether is not > 1 ether)
    await expect(
      wallet.connect(user).Collect(minSum)
    ).to.be.reverted;
  });
});