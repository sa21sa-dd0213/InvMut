import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m718d9509 test", function () {
  it("should detect sha256 mutation by verifying transferFrom selector mismatch", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a reverting receiver contract that will revert on unknown selectors
    // This contract will only accept the correct keccak256 selector
    const RevertingReceiverFactory = await ethers.getContractFactory("RevertingReceiver");
    const revertingReceiver = await RevertingReceiverFactory.deploy();
    await revertingReceiver.waitForDeployment();

    // Set the code at the caddress to our reverting receiver
    // This way, the correct keccak256 selector will succeed, but sha256 will cause a revert
    await ethers.provider.send("hardhat_setCode", [
      "0x1f844685f7Bf86eFcc0e74D8642c54A257111923",
      await ethers.provider.send("eth_getCode", [await revertingReceiver.getAddress()])
    ]);

    // Impersonate the authorized address
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const impersonatedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the impersonated account
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1")
    });

    // Prepare test data
    const tos = [addr1.address];
    const values = [100];

    // Call transfer - this should not revert because the correct keccak256 selector is used
    // If the mutant used sha256, the call would revert due to unknown selector
    await expect(
      instance.connect(impersonatedSigner).transfer(tos, values)
    ).to.not.be.reverted;

    // Clean up
    await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
  });
});