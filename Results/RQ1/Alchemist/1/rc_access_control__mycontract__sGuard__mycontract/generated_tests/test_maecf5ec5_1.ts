import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract - kill mutant maecf5ec5", function () {
  it("should succeed when owner calls sendTo (mutant changes == to !=, so owner call should revert in mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner sends 1 ETH to addr1
    const tx = await instance.connect(owner).sendTo(addr1.address, ethers.parseEther("1"), {
      value: ethers.parseEther("1")
    });
    await expect(tx).to.not.be.reverted;
  });
});