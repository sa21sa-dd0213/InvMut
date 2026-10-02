import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test mc1618cb7", function () {
  it("should detect when from address is changed from hardcoded address to address(this)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the contract address
    const contractAddress = await instance.getAddress();

    // Check that the 'from' address is NOT the contract address
    const fromAddress = await instance.from();
    expect(fromAddress).to.not.equal(contractAddress);

    // Verify it equals the original hardcoded address
    const hardcodedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    expect(fromAddress).to.equal(hardcodedAddress);

    // Prepare test parameters
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token (will be multiplied by 1e18)

    // Call transfer from authorized address (owner)
    const tx = await instance.connect(owner).transfer(recipients, amounts);
    await tx.wait();

    // The test passes if we reach here without revert
    // The mutant would have from = address(this) instead of hardcoded address
    // This test kills the mutant because the assertion on fromAddress fails
  });
});