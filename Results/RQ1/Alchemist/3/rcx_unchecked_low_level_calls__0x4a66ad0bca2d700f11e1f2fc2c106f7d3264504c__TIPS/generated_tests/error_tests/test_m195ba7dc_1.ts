import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m195ba7dc - keccak256 replaced with sha256", function () {
  it("should kill mutant by showing that sha256 produces wrong function selector, causing revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The contract has hardcoded addresses:
    // from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9 (the owner)
    // caddress = 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // Only the owner (0x9797...) can call transfer()
    
    // Get the owner signer by impersonating the hardcoded address
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const ownerSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the owner with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });
    
    // Prepare test data: send 1 token to addr1
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token (will be multiplied by 10^18 internally)
    
    // This call should revert because sha256 produces a different selector than keccak256
    // for "transferFrom(address,address,uint256)"
    await expect(
      instance.connect(ownerSigner).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});