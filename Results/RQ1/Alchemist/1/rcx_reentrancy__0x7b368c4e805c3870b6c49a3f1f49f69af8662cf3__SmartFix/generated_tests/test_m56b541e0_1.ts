import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m56b541e0", function () {
  it("should revert when Put is called with 0 ether (mutant changes >= to >)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with the Log contract address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await W_WALLETFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Attempt to call Put with 0 ether - should revert on mutant but pass on original
    // The original contract allows this (0 >= 0 is true), but mutant requires > 0
    await expect(
      wallet.connect(owner).Put(0, { value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});