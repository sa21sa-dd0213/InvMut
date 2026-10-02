import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant me5ff4b17", function () {
  it("should kill mutant by sending positive ether via multiplicate and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Send a positive amount via multiplicate - should pass on original, revert on mutant
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("0.5")
    });
    
    await expect(tx).to.not.be.reverted;
  });
});