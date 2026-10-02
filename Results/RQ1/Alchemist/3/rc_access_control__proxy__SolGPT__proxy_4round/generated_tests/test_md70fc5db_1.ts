import { expect } from "chai";
import { ethers } from "hardhat";

describe("Proxy mutant detection test", function () {
  it("should revert when forward call fails (detects removal of require(_s))", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Proxy (no constructor arguments needed - constructor takes no params)
    const Factory = await ethers.getContractFactory("Proxy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a dummy contract that will revert when called
    const DummyFactory = await ethers.getContractFactory("contract Dummy { function fail() external pure { revert('fail'); } }");
    const dummy = await DummyFactory.deploy();
    await dummy.waitForDeployment();
    
    // Encode call to dummy's fail function
    const data = dummy.interface.encodeFunctionData("fail");
    
    // The original contract would revert due to require(_s)
    // The mutant would silently succeed
    await expect(
      instance.forward(dummy.target, data)
    ).to.be.reverted;
  });
});