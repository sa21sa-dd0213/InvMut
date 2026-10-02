import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant mcbc0d017 test", function () {
  it("should revert when _tos array is empty (original behavior) - mutant fails this test", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an empty array of addresses
    const emptyAddresses: string[] = [];

    // Test: calling transfer with empty _tos array should revert
    // because require(_tos.length > 0) fails in original
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        emptyAddresses,
        100,
        18
      )
    ).to.be.reverted;
  });
});