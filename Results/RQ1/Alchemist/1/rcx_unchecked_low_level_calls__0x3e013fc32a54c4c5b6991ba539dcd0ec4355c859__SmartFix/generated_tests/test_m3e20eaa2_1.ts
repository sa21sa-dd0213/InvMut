import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant test - m3e20eaa2", function () {
  it("should revert when Owner calls Command (mutant requires msg.sender != Owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so balance checks don't interfere
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // The mutant changes require(msg.sender == Owner) to require(msg.sender != Owner)
    // So calling Command from Owner should revert in the mutant (but succeed in original)
    const data = "0x";
    await expect(
      instance.connect(owner).Command(addr1.address, data, { value: ethers.parseEther("0.1") })
    ).to.be.reverted;
  });
});