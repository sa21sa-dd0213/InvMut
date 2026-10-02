import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m44a9ed6d test", function () {
  it("should revert when a transferFrom call fails inside the loop", async function () {
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // The contract's `from` address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate this address to call transfer
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const fromSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the fromSigner with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1")
    });

    // The contract's `caddress` is hardcoded as 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // This address likely doesn't have a proper transferFrom implementation
    // So any call to it will fail (return false)
    
    // Create arrays with one recipient to trigger the loop
    const tos = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 1e18 internally)

    // Call transfer from the authorized address
    // This should revert because the internal call to caddress will fail
    await expect(
      instance.connect(fromSigner).transfer(tos, values)
    ).to.be.reverted;

    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
  });
});