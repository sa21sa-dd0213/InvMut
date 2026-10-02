import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when owner calls sendTo (mutant kills owner access)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Original contract allows owner to send; mutant with != will revert
    await expect(
      instance.connect(owner).sendTo(addr1.address, ethers.parseEther("0.1"))
    ).to.be.reverted;
  });
});