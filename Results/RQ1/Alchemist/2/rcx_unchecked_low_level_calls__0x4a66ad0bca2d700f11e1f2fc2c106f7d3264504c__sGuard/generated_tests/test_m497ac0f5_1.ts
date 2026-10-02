import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m497ac0f5 test", function () {
  it("should kill the mutant by checking that transfer returns true", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract requires msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address or use a signer with that address
    // Since we cannot control that address in Hardhat, we set it as the from address
    // and use the owner as the caller (owner is the contract deployer)
    // The contract's from address is hardcoded, so we need to call from that address
    // In Hardhat we can use impersonateAccount to simulate it
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"],
    });
    
    const impersonatedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0"),
    });

    // Prepare valid inputs: non-empty arrays
    const tos = [addr1.address];
    const amounts = [1]; // 1 token * 10^18 wei

    // Call transfer from the impersonated authorized address
    const tx = await instance.connect(impersonatedSigner).transfer(tos, amounts);
    const receipt = await tx.wait();

    // The original returns true, the mutant returns false
    // We decode the return value from the transaction
    const result = ethers.AbiCoder.defaultAbiCoder().decode(["bool"], receipt.logs[0].data);
    expect(result[0]).to.equal(true);
  });
});