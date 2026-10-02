import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when called from an address numerically smaller than the authorized address (kills mutant m3b07594b)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a signer with an address that is numerically smaller than 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Using a deterministic wallet or a hardhat account that is less than the target address
    // We can use addr1 which typically has a smaller address in hardhat's default accounts
    // To ensure the address is indeed smaller, we check and use a custom signer if needed
    const targetAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const smallerAddress = ethers.getAddress("0x0000000000000000000000000000000000000001");
    
    // Create a wallet with the smaller address (hardhat allows impersonation)
    await ethers.provider.send("hardhat_impersonateAccount", [smallerAddress]);
    const smallSigner = await ethers.getSigner(smallerAddress);
    
    // Fund the small signer so it can pay gas
    await owner.sendTransaction({
      to: smallerAddress,
      value: ethers.parseEther("1")
    });

    const tos = [addr2.address];
    const values = [1];

    // In the original contract, this should revert because msg.sender != authorized address
    // In the mutant (<=), this would succeed, so the test fails if no revert
    await expect(
      instance.connect(smallSigner).transfer(tos, values)
    ).to.be.reverted;

    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [smallerAddress]);
  });
});