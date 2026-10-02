import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mabdab048 test", function () {
  it("should kill mutant by using a nonzero v[i] value that passes original but fails mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The from address in the contract is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to use an account that matches this address to pass the require check
    // Impersonate or use the specific account that matches from
    await ethers.provider.send("hardhat_impersonateAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    ]);
    const fromSigner = await ethers.getSigner(
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    );

    // Fund the impersonated account to pay for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1")
    });

    // Use a nonzero value like 1 - this passes the original's multiplication check
    // but fails the mutant's addition check: (1 + 10^18) / 1 != 10^18
    const recipients = ["0x1f844685f7Bf86eFcc0e74D8642c54A257111923"];
    const values = [1]; // Small nonzero value that kills the mutant

    await expect(
      instance.connect(fromSigner).transfer(recipients, values)
    ).to.be.reverted;
  });
});