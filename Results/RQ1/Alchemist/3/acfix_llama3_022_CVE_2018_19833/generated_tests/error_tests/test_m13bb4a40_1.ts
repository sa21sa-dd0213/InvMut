import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when transferring to a frozen account (kills mutant that removes frozen check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Freeze addr2
    await instance.freezeAccount(addr2.address, true);

    // Attempt to transfer from owner to frozen addr2 - should revert
    await expect(
      instance.transfer(addr2.address, 100)
    ).to.be.reverted;
  });
});