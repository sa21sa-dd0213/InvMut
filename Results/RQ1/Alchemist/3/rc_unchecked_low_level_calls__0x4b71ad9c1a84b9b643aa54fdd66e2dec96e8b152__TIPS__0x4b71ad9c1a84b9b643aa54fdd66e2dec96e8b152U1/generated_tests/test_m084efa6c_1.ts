import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test", function () {
  it("should revert when external call fails, but mutant does not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that will always fail when called
    const FailFactory = await ethers.getContractFactory("contract FailOnCall { function() external payable { revert(); } }");
    const failContract = await FailFactory.deploy();
    await failContract.waitForDeployment();

    const tos = [addr1.address, addr2.address];
    const value = ethers.parseEther("0");

    // This call should revert in the original (due to require(_s)), 
    // but will succeed (return true) in the mutant
    const tx = instance.transfer(owner.address, failContract.target, tos, value);
    await expect(tx).to.be.reverted;
  });
});