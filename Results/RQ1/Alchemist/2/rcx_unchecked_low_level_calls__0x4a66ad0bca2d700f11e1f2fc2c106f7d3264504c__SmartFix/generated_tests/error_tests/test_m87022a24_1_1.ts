import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("EBU mutant m87022a24 test", function () {
  it("should detect the mutant by verifying the from address in the transfer call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the contract address
    const contractAddress = await instance.getAddress();

    // The original hardcoded from address
    const originalFromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    // Prepare test data
    const tos = [addr1.address];
    const values = [1]; // Non-zero value

    // Call transfer function from the authorized sender (original from address)
    // We need to impersonate or use the original from address as signer
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [originalFromAddress]
    });
    const originalSigner = await ethers.getSigner(originalFromAddress);

    // Fund the account if needed (it might need ETH for gas)
    await owner.sendTransaction({
      to: originalFromAddress,
      value: ethers.parseEther("1.0")
    });

    // Execute the transfer
    const tx = await instance.connect(originalSigner).transfer(tos, values);
    await tx.wait();

    // Get the from address from the contract to check if it was mutated
    const fromAddressOnChain = await instance.from();

    // The mutant changes from to address(this), so it should equal contract address
    // The original would have the hardcoded address
    expect(fromAddressOnChain).to.equal(contractAddress,
      "Mutant detected: from should be address(this) in the mutant, not the original hardcoded address");

    // Stop impersonating
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [originalFromAddress]
    });
  });
});