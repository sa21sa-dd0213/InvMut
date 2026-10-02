import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m5c6e085c test", function () {
  it("should revert when _tos array is empty (original behavior) but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The transfer function requires msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
        
    // Impersonate the authorized address to send the transaction
    await ethers.provider.send("hardhat_impersonateAccount", [authorizedAddress]);
    const authorizedSigner = await ethers.getSigner(authorizedAddress);
        
    // Fund the impersonated account so it can pay gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0")
    });

    // Call transfer with empty _tos array and an empty v array
    const tx = instance.connect(authorizedSigner).transfer([], []);

    // The original contract reverts with require(_tos.length > 0)
    // The mutant (>= 0) allows empty array and returns true
    await expect(tx).to.be.reverted;
  });
});