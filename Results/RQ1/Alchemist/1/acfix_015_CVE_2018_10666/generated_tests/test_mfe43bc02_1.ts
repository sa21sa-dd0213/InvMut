import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant mfe43bc02 test", function () {
  it("should detect mutant that removed return true from setOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner and expect the transaction to return a boolean value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // The mutant removed the return statement, so the function call should not return true
    // We can verify this by checking that the transaction receipt does not indicate a successful return value
    // or by checking that the return value from the contract call is not true
    const result = await instance.connect(owner).setOwner.staticCall(addr1.address);
    expect(result).to.equal(true);
  });
});