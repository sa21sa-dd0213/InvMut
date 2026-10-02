import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test", function () {
  it("should revert when tos array is empty (original behavior)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an empty tos array and corresponding empty vs array
    const emptyTos: string[] = [];
    const emptyVs: bigint[] = [];

    // Use a dummy token contract address (here we use addr1's address as a placeholder)
    const dummyTokenAddress = addr1.address;

    // This should revert because tos.length > 0 is required in original
    await expect(
      instance.transfer(dummyTokenAddress, emptyTos, emptyVs)
    ).to.be.reverted;
  });
});