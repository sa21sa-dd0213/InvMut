import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mfcaadb15", function () {
  it("should revert when sending an amount different from TICKET_AMOUNT (10 wei)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with 1 wei instead of the required 10 wei
    await expect(
      instance.connect(addr1).play({ value: ethers.parseEther("0.000000000000000001") })
    ).to.be.reverted;
  });
});