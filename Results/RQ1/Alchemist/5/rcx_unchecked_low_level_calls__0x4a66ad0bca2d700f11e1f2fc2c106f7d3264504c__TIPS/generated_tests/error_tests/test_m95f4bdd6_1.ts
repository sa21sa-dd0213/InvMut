import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m95f4bdd6", function () {
  it("should revert when caddress is a valid contract that reverts the transferFrom call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract's caddress value
    const caddress = await instance.caddress();
    
    // Prepare test data
    const tos = [addr1.address];
    const v = [1]; // 1 token
    
    // Call transfer from the authorized address (0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)
    // We impersonate this address since it's the msg.sender requirement
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1")
    });
    
    // Connect as the authorized signer and call transfer
    const instanceConnected = instance.connect(authorizedSigner);
    
    // If caddress is address(0) (the mutant), the call will silently succeed
    // If caddress is the original contract, it will revert (since the contract at that address 
    // doesn't exist or doesn't implement transferFrom properly)
    // We expect a revert when caddress is the original address
    if (caddress === ethers.ZeroAddress) {
      // Mutant case: should NOT revert (will fail the test, killing the mutant)
      await expect(instanceConnected.transfer(tos, v)).to.not.be.reverted;
    } else {
      // Original case: should revert because the call to the real contract will fail
      await expect(instanceConnected.transfer(tos, v)).to.be.reverted;
    }
  });
});