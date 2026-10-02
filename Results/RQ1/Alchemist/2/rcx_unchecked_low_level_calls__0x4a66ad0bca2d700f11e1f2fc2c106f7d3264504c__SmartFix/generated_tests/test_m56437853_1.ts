import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m56437853", function () {
  it("should kill the mutant by triggering out-of-bounds access when i <= _tos.length", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract requires msg.sender to be the hardcoded address 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [authorizedAddress],
    });
    
    const authorizedSigner = await ethers.getSigner(authorizedAddress);
    
    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0"),
    });

    // Prepare a single-element array - this will cause the mutant to fail
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1]; // Non-zero value to pass the multiplication check

    // The original passes, the mutant reverts due to out-of-bounds access
    await expect(
      instance.connect(authorizedSigner).transfer(tos, values)
    ).to.be.reverted;

    // Clean up impersonation
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [authorizedAddress],
    });
  });
});