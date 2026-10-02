import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m81d0d710 - burn return value", function () {
  it("should return true when burn is called by owner with valid amount", async function () {
    const [owner] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(
      initialSupply,
      "TestToken",
      "TTK"
    );
    await instance.waitForDeployment();

    const burnAmount = 100;
    const tx = await instance.burn(burnAmount);
    const receipt = await tx.wait();

    // The burn function should return true; if mutant removed return true, it will return false
    expect(tx).to.emit(instance, "Burn").withArgs(owner.address, burnAmount);

    // Verify the return value is true by checking the transaction result
    // The function returns bool, so we can check it via a static call
    const returnValue = await instance.burn.staticCall(burnAmount);
    expect(returnValue).to.equal(true);
  });
});