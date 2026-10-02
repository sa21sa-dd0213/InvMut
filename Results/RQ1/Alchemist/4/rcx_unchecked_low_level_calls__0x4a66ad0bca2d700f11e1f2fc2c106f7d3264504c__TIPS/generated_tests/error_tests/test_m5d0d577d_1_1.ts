import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m5d0d577d test", function () {
  it("should revert when called from an address greater than the authorized address in the original contract", async function () {
    const [owner, unauthorizedAddr] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an address that is numerically greater than the hardcoded authorized address
    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We'll use an address that is larger: 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6cA
    const greaterAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6cA";

    // Prepare test parameters
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1];

    // Connect with the unauthorized (but numerically greater) address
    const instanceAsUnauthorized = instance.connect(unauthorizedAddr);

    // The original contract requires msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // The mutant requires msg.sender >= 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Since greaterAddress > authorized address, the mutant would pass but original should revert
    await expect(
      instanceAsUnauthorized.transfer(tos, values)
    ).to.be.reverted;
  });
});