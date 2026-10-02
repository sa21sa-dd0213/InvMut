import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m497ac0f5 test", function () {
  it("should return true from transfer function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The transfer function requires msg.sender to be 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address or use a signer with that address
    // Since we can't directly control that address in Hardhat, we use hardhat_impersonateAccount
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);

    const fromSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0"),
    });

    const recipients = [addr1.address];
    const amounts = [1]; // 1 token

    // Call transfer and check that it returns true
    const tx = await instance.connect(fromSigner).transfer(recipients, amounts);
    await tx.wait();

    // The mutated function will not return true, so this assertion should fail
    // We check the return value by decoding the transaction result
    const result = await instance.connect(fromSigner).transfer.staticCall(recipients, amounts);
    expect(result).to.equal(true);
  });
});