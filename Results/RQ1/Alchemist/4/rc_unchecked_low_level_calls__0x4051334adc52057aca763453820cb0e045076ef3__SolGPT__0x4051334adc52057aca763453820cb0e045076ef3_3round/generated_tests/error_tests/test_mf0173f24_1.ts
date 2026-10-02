import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kill mutant mf0173f24)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an empty array of addresses
    const emptyAddresses: string[] = [];

    // Attempt to call transfer with empty _tos array - should revert in original, succeed in mutant
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, 100)
    ).to.be.reverted;
  });
});