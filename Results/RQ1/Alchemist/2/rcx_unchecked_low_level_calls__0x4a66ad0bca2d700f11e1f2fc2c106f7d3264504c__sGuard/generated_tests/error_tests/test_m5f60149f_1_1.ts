import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m5f60149f", function () {
  it("should kill mutant by detecting wrong from address in transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the current from address stored in the contract
    const storedFrom = await instance.from();

    // The original contract has from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // The mutant changes it to 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // The require(msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9) still checks the original address

    // Setup test parameters
    const tos = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 1e18 internally)

    // Test that calling from unauthorized address reverts (same as original)
    await expect(
      instance.connect(addr1).transfer(tos, values)
    ).to.be.reverted;

    // Check that the stored from address is the one from the mutant
    expect(storedFrom).to.equal("0x1f844685f7Bf86eFcc0e74D8642c54A257111923");
  });
});