import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending incorrect ticket amount (mutant detection test)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 5 wei instead of the required 10 wei
    const tx = instance.connect(addr1).play({ value: 5 });
    await expect(tx).to.be.reverted;
  });
});