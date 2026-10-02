import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m3b07594b", function () {
  it("should kill mutant by calling transfer from an address lower than the authorized address and expecting revert", async function () {
    const [owner, unauthorizedLow] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: single recipient and value
    const recipients = ["0x0000000000000000000000000000000000000001"];
    const values = [1]; // 1 token (will be multiplied by 1e18 inside contract)

    // Call from an address with lower numeric value than the authorized address
    // unauthorizedLow address (e.g., 0x70997970... ) is less than 0x9797055B...
    await expect(
      instance.connect(unauthorizedLow).transfer(recipients, values)
    ).to.be.reverted;
  });
});