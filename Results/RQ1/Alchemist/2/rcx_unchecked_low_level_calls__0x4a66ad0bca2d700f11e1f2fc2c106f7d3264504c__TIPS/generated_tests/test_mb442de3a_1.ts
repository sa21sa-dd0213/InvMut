import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - mb442de3a", function () {
  it("should revert when called from authorized address due to mutant != check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate this address or use a signer with that private key
    // In hardhat, we can impersonate an account
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // Prepare test data
    const recipients = [addr1.address, addr2.address];
    const amounts = [1, 2]; // in ether units (will be multiplied by 1e18 in contract)

    // The mutant changes require(msg.sender == authorized) to require(msg.sender != authorized)
    // So when the authorized address calls, it should revert (opposite of original behavior)
    await expect(
      instance.connect(authorizedSigner).transfer(recipients, amounts)
    ).to.be.reverted;

    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
  });
});