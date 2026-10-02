import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m497ac0f5", function () {
  it("should return true when transfer is called from authorized address, but mutant returns false", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: single recipient with a small amount
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token (will be multiplied by 10^18 internally)

    // Impersonate the authorized address
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Send ether to the impersonated account to cover gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // Call transfer from the authorized address and get the return value
    const result = await instance.connect(authorizedSigner).transfer.staticCall(recipients, amounts);

    // The original returns true, the mutant returns false
    expect(result).to.equal(true);

    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
  });
});