import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - mb442de3a", function () {
  it("should kill mutant by calling transfer from authorized address and expecting success", async function () {
    const [authorizedAddr, addr1, addr2] = await ethers.getSigners();

    // Deploy EBU contract (no constructor arguments needed based on the contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify that the authorized address matches the hardcoded from address in the contract
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const authorizedSigner = await ethers.getImpersonatedSigner(authorizedAddress);

    // Fund the authorized signer with some ETH to pay for gas
    await authorizedAddr.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0")
    });

    // Prepare test data: single recipient and value
    const recipients = [addr1.address];
    const values = [1]; // 1 token

    // Call transfer from the authorized address - should succeed in original but fail in mutant
    const tx = await instance.connect(authorizedSigner).transfer(recipients, values);
    await tx.wait();

    // If we reach here, the transaction succeeded (original behavior)
    // The mutant would revert because msg.sender != authorizedAddress would be false
    // So this test kills the mutant by passing on original but failing on mutant
    expect(true).to.be.true; // Ensure we have at least one assertion
  });
});