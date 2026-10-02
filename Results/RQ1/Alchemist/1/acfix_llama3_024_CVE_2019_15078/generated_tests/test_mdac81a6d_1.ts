import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - Kill mutant mdac81a6d (missing Burn event)", function () {
  it("should emit Burn event when burn() is called, failing the mutant that removed the event", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure owner has tokens to burn (constructor sets balances[owner] = totalDistributed)
    const burnAmount = ethers.parseEther("1000");

    // Expect the Burn event to be emitted with correct parameters
    await expect(instance.connect(owner).burn(burnAmount))
      .to.emit(instance, "Burn")
      .withArgs(owner.address, burnAmount);
  });
});