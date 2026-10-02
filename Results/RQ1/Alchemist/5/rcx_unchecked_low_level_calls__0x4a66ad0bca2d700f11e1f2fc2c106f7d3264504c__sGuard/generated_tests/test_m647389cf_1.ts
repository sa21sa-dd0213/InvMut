import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m647389cf by calling transfer from a higher address than the authorized one", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the authorized address from the contract
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    // Create an address that is numerically greater than the authorized address
    // 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6cA is greater than 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const higherAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6cA";

    // Impersonate the higher address (or use it as signer if available)
    // Since we cannot directly use this address as a signer, we will use ethers' impersonation for testing
    await ethers.provider.send("hardhat_impersonateAccount", [higherAddress]);
    const higherSigner = await ethers.getSigner(higherAddress);

    // Fund the higher address with some ETH to pay for gas
    await owner.sendTransaction({
      to: higherAddress,
      value: ethers.parseEther("1.0")
    });

    // Prepare test data: at least one recipient and a value
    const recipients = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 10^18 internally)

    // The original contract should revert when called from a non-authorized address
    // The mutant (with >=) will allow this call to succeed
    await expect(
      instance.connect(higherSigner).transfer(recipients, values)
    ).to.be.reverted;

    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [higherAddress]);
  });
});