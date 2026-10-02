import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls withdraw (detect mutant that removes owner check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdraw has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdraw from a non-owner account
    await expect(
      instance.connect(addr1).withdraw()
    ).to.be.reverted;
  });
});