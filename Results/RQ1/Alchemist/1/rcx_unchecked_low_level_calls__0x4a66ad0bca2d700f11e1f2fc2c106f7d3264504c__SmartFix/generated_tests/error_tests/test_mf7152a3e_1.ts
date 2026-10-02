import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mf7152a3e", function () {
  it("should revert when _tos array is empty (original behavior), but mutant would not revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's from address is hardcoded: 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address to call transfer
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const fromSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the from address so it can pay gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // Call transfer with empty _tos array
    const tx = instance.connect(fromSigner).transfer([], []);
    
    // Original contract reverts because require(_tos.length > 0) fails
    // Mutant would not revert, thus this test kills the mutant
    await expect(tx).to.be.reverted;
  });
});