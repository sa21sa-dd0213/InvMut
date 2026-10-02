import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m4bb153a4 by causing out-of-bounds access with <= in loop", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed based on provided code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The contract's `from` address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to use this address as msg.sender to pass the first require
    const fromSigner = await ethers.getImpersonatedSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the impersonated signer with some ETH for gas
    await owner.sendTransaction({
      to: fromSigner.address,
      value: ethers.parseEther("1.0")
    });
    
    // Create arrays with exactly one element
    const tos = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 10^18)
    
    // The original contract with i < _tos.length would succeed for 1 element
    // The mutant with i <= _tos.length will try to access _tos[1] and v[1] which are out of bounds -> revert
    await expect(
      instance.connect(fromSigner).transfer(tos, values)
    ).to.be.reverted;
  });
});