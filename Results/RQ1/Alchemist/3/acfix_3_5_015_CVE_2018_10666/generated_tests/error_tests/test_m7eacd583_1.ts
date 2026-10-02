import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when admin calls setOwner, but mutant returns false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner as the admin (which is the deployer/owner)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const result = await tx.wait();

    // In the original contract, setOwner returns true.
    // In the mutant, it returns false (default bool value) because return statement is removed.
    // Decode the return value from the transaction receipt
    const decodedResult = ethers.AbiCoder.defaultAbiCoder().decode(
      ["bool"],
      result!.logs[0]?.data || "0x"
    );

    // For the original contract, this should be true; for the mutant, it will be false.
    // We expect true, so the mutant will fail this assertion.
    expect(decodedResult[0]).to.equal(true);
  });
});