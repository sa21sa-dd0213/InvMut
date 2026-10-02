import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should emit FrozenFunds event when freezeAccount is called by owner - mutant removes emit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TT");
    await instance.waitForDeployment();

    // Freeze addr1 and expect the FrozenFunds event to be emitted
    await expect(instance.freezeAccount(addr1.address, true))
      .to.emit(instance, "FrozenFunds")
      .withArgs(addr1.address, true);
  });
});