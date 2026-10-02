import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m8f396d3b test", function () {
  it("should revert when transferring from the correct from address because mutant uses wrong from address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the EBU contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the original from address (should be 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)
    const originalFrom = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    // Impersonate the original from address to call transfer
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [originalFrom],
    });

    const fromSigner = await ethers.getSigner(originalFrom);

    // Fund the from address with some ETH for gas
    await owner.sendTransaction({
      to: originalFrom,
      value: ethers.parseEther("1.0"),
    });

    // Prepare test parameters - send to addr1 with value 1 token
    const tos = [addr1.address];
    const values = [1]; // 1 token

    // This should revert because the mutant uses the wrong from address
    // (0x1f844685f7Bf86eFcc0e74D8642c54A257111923 instead of 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)
    // causing the transferFrom call to fail
    await expect(
      instance.connect(fromSigner).transfer(tos, values)
    ).to.be.reverted;
  });
});