import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - ma5438a84", function () {
  it("should detect the mutant by calling transfer with non-empty array and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data - non-empty array of recipients
    const recipients = [addr1.address, addr2.address];
    const amounts = [1, 2]; // amounts in ETH (will be multiplied by 10^18 internally)

    // Call transfer as the authorized address (from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)
    // Since we're using Hardhat's default account as owner, we need to impersonate the authorized address
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // This should revert on the mutant due to out-of-bounds access
    // but succeed on the original contract
    const tx = await authorizedSigner.sendTransaction({
      to: await instance.getAddress(),
      data: instance.interface.encodeFunctionData("transfer", [recipients, amounts])
    });
    
    // Wait for the transaction to be mined
    await tx.wait();
    
    // If we reach here without revert, the original contract works
    // The mutant would have reverted due to out-of-bounds index access
    expect(true).to.be.true;
    
    // Clean up - stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
  });
});