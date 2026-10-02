import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test", function () {
  it("should kill mutant mc77b4289 by sending non-zero ether to Put", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Send 1 wei to Put function - should succeed on original but fail on mutant
    const tx = instance.connect(owner).Put(0, { value: ethers.parseEther("1") });
    
    // The mutant's == check will cause revert for any non-zero value
    await expect(tx).to.be.reverted;
  });
});