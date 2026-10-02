import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m58ce1a79 test", function () {
  it("should revert when _tos array is empty (kills mutant that removed require(_tos.length > 0))", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's from address is set to the authorized sender
    // We use the owner account to match the from address for the require(msg.sender == ...) check
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    await expect(
      instance.transfer(emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});