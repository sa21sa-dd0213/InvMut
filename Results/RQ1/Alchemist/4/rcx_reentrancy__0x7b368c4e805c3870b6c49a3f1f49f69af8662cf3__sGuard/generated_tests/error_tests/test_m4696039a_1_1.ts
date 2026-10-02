import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m4696039a - block.timestamp >= unlockTime", function () {
  it("should revert when collecting exactly at unlockTime (original uses >, mutant uses >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTime = block!.timestamp;
    
    // Set unlock time to current time + 100 seconds
    const unlockTime = currentTime + 100;
    
    // Send 2 ether to trigger Put with the unlockTime
    await addr1.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("2")
    });
    
    // Mine blocks until we reach exactly the unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime]);
    await ethers.provider.send("evm_mine", []);
    
    // Now block.timestamp == unlockTime exactly
    // Original contract would revert (requires >), mutant would allow (requires >=)
    await expect(
      wallet.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});