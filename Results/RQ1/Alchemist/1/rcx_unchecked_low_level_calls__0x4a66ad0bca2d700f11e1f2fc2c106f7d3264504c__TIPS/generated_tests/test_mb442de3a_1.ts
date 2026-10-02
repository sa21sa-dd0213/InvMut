import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when called by authorized address after mutant changes == to !=", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The authorized address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate this address since it's not one of our signers
    await ethers.provider.send("hardhat_impersonateAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    ]);
    const authorizedSigner = await ethers.getSigner(
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    );

    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    const tos = [addr1.address];
    const values = [1];

    // On the original contract, this call from the authorized address succeeds
    // On the mutant, it reverts because the condition is inverted (msg.sender != authorizedAddress)
    await expect(
      instance.connect(authorizedSigner).transfer(tos, values)
    ).to.be.reverted;

    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    ]);
  });
});