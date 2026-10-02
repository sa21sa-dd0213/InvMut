import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET - Kill mutant mb93d900e", function () {
  it("should revert Collect when balance > MinSum due to == mutation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    
    // addr1 deposits 2 ether (greater than MinSum)
    const depositAmount = ethers.parseEther("2");
    await wallet.connect(addr1).Put(0, { value: depositAmount });
    
    // Fast forward time past unlockTime (unlockTime was set to block.timestamp since _unlockTime=0)
    await ethers.provider.send("evm_increaseTime", [3600]); // +1 hour
    await ethers.provider.send("evm_mine", []);
    
    // addr1 tries to collect 1 ether (balance is 2 ether, which is >= MinSum in original but == fails in mutant)
    const collectAmount = ethers.parseEther("1");
    
    // In original: should succeed because 2 >= 1
    // In mutant: should fail because 2 != 1 (balance != MinSum)
    await expect(
      wallet.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});