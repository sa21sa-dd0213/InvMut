import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mef412cf8 - return true removal", function () {
  it("should return true on successful transfer, but mutant returns false or reverts", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy with no constructor arguments (contract has none)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare valid inputs for the transfer function
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1]; // v[i] != 0, so the arithmetic check passes
    
    // Call transfer from the authorized address (0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)
    // We need to impersonate this address since it's hardcoded in the require
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the authorized address to pay gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1")
    });
    
    // Call the transfer function
    const tx = await instance.connect(authorizedSigner).transfer(tos, values);
    const receipt = await tx.wait();
    
    // The original returns true; the mutant removes return true, so it returns false or reverts
    // Check that the transaction succeeded (no revert) and the return value is true
    expect(receipt.status).to.equal(1); // Transaction succeeded
    
    // Get the return value from the transaction
    const result = await instance.connect(authorizedSigner).transfer.staticCall(tos, values);
    expect(result).to.equal(true);
    
    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
  });
});