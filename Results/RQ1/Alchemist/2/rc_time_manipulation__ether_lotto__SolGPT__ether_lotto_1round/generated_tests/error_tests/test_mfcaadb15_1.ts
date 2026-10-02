import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant mfcaadb15 test", function () {
  it("should revert when sending incorrect value (not TICKET_AMOUNT)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with value different from TICKET_AMOUNT (10 wei)
    const incorrectValue = ethers.parseEther("1"); // 1 ether ≠ 10 wei
    await expect(
      instance.connect(addr1).play({ value: incorrectValue })
    ).to.be.reverted;
  });
});