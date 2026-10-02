import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m35bcafb6 test", function () {
  it("should revert when Collect is called exactly at unlock time (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block!.timestamp;
    
    // Send ether with unlock time equal to current timestamp
    const putTx = await instance.connect(addr1).Put(currentTimestamp, {
      value: ethers.parseEther("2")
    });
    await putTx.wait();
    
    // Try to collect exactly at unlock time - should revert on original
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});