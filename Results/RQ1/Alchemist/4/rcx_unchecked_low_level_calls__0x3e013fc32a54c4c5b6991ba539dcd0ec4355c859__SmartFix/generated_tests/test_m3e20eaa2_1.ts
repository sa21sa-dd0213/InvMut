import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant m3e20eaa2", function () {
  it("should revert when Owner calls Command due to mutated access control", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so we can test with a non-zero msg.value if needed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Test: Owner should be able to call Command in original, but mutant reverses the condition
    // The mutant requires msg.sender != Owner, so Owner's call should revert
    const dummyAddress = addr1.address;
    const dummyData = "0x";
    
    await expect(
      instance.connect(owner).Command(dummyAddress, dummyData, {
        value: ethers.parseEther("0.1")
      })
    ).to.be.reverted;
  });
});