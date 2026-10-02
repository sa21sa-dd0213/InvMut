import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection test", function () {
  it("should detect mutant m50a44ffe by verifying the from address is used correctly in transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the from address from the contract
    const fromAddress = await instance.from();
    
    // The authorized sender is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const authorizedSigner = await ethers.getImpersonatedSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the authorized signer with some ETH for gas
    await owner.sendTransaction({
      to: authorizedSigner.address,
      value: ethers.parseEther("1.0")
    });

    // Prepare test parameters
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token

    // In the original contract, from == authorizedSigner.address
    // In the mutant, from == 0x1f844685f7Bf86eFcc0e74D8642c54A257111923 (different)
    
    // Call transfer from the authorized address
    const tx = await instance.connect(authorizedSigner).transfer(recipients, amounts);
    await tx.wait();

    // Verify the from address stored in contract
    const storedFrom = await instance.from();
    
    // The test will fail on the mutant because:
    // - Original: from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9 (same as authorized sender)
    // - Mutant: from = 0x1f844685f7Bf86eFcc0e74D8642c54A257111923 (different address)
    // This difference in from address affects the transferFrom call behavior
    expect(storedFrom).to.equal("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Additional check: verify that the transferFrom call was made with correct from address
    // by checking that the transaction succeeded (no revert)
    expect(tx).to.not.be.reverted;
  });
});