import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant med64a1e4 - sha256 vs keccak256", function () {
  it("should revert when calling transfer with sha256 instead of keccak256 for function selector", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();
    
    // Deploy a simple mock that implements transferFrom(address,address,uint256)
    // We need a contract that will revert when called with wrong selector
    const MockFactory = await ethers.getContractFactory("contract MockERC20 { function transferFrom(address,address,uint256) external pure returns (bool) { return true; } }");
    const mock = await MockFactory.deploy();
    await mock.waitForDeployment();
    
    const tos = [to.address];
    const v = 100;
    
    // The original uses keccak256 to compute selector, mutant uses sha256
    // sha256 will produce a different selector, causing the call to fail
    // since the mock only implements the correct transferFrom selector
    await expect(
      demo.connect(owner).transfer(from.address, mock.target, tos, v)
    ).to.be.reverted;
  });
});