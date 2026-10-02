import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m145eadc4", function () {
  it("should detect mutant by verifying caddress is not address(this)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the deployed contract address
    const contractAddress = await instance.getAddress();

    // Check that caddress is NOT the contract itself (mutant would make it address(this))
    const caddress = await instance.caddress();
    expect(caddress).to.not.equal(contractAddress, "caddress should not be address(this) in original");

    // Verify it matches the original hardcoded address
    const expectedAddress = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";
    expect(caddress.toLowerCase()).to.equal(expectedAddress.toLowerCase());

    // Prepare test call to transfer function
    const tos = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 10^18)

    // Call transfer as the authorized sender (0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)
    // We need to impersonate this address since we don't have its private key
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"],
    });

    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the authorized account with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0"),
    });

    // Call transfer - in original, this would call external contract
    // In mutant, this would call itself (which doesn't have transferFrom)
    const tx = await instance.connect(authorizedSigner).transfer(tos, values);
    await tx.wait();

    // Verify the call didn't revert (original behavior)
    // The mutant would likely revert because contract doesn't implement transferFrom
    expect(tx).to.not.be.reverted;

    // Stop impersonating
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"],
    });
  });
});